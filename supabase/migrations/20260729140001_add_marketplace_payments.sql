-- Marketplace hardening: listing saves, order RPC, MPESA payment stubs

-- 1. Extend saves table to also support listing saves (unified save system)
ALTER TABLE public.saves DROP CONSTRAINT IF EXISTS saves_target_type_check;
ALTER TABLE public.saves ADD CONSTRAINT saves_target_type_check
  CHECK (target_type IN ('post', 'answer', 'listing'));

-- 2. Update toggle_save to handle all three types
CREATE OR REPLACE FUNCTION public.toggle_save(p_target_type text, p_target_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_deleted boolean := false;
  v_total integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_target_type NOT IN ('post', 'answer', 'listing') THEN
    RAISE EXCEPTION 'Invalid target type';
  END IF;

  DELETE FROM public.saves
  WHERE user_id = v_user_id AND target_type = p_target_type AND target_id = p_target_id;

  IF FOUND THEN
    v_deleted := true;
  ELSE
    BEGIN
      INSERT INTO public.saves (user_id, target_type, target_id)
      VALUES (v_user_id, p_target_type, p_target_id);
    EXCEPTION WHEN unique_violation THEN
      v_deleted := true;
    END;
  END IF;

  SELECT count(*) INTO v_total
  FROM public.saves
  WHERE target_type = p_target_type AND target_id = p_target_id;

  RETURN jsonb_build_object('saved', NOT v_deleted, 'total', v_total);
END;
$$;

-- 3. Transactional create_order RPC (validates, locks inventory, inserts order)
CREATE OR REPLACE FUNCTION public.create_order(
  p_listing_id uuid,
  p_quantity integer DEFAULT 1,
  p_delivery_address text DEFAULT '',
  p_contact_phone text DEFAULT '',
  p_delivery_notes text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_listing public.marketplace_listings;
  v_order_id uuid;
  v_total_price numeric(12,2);
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_listing
  FROM public.marketplace_listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF v_listing.seller_id = v_user_id THEN RAISE EXCEPTION 'Cannot buy your own listing'; END IF;
  IF v_listing.status != 'active' THEN RAISE EXCEPTION 'Listing is not available'; END IF;
  IF v_listing.is_active = false THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF v_listing.stock_quantity IS NOT NULL AND v_listing.stock_quantity < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  v_total_price := v_listing.price * p_quantity;

  INSERT INTO public.marketplace_orders
    (listing_id, buyer_id, seller_id, quantity, unit_price, total_price,
     delivery_address, contact_phone, delivery_notes, status)
  VALUES
    (p_listing_id, v_user_id, v_listing.seller_id, p_quantity, v_listing.price,
     v_total_price, p_delivery_address, p_contact_phone, p_delivery_notes, 'pending')
  RETURNING id INTO v_order_id;

  IF v_listing.stock_quantity IS NOT NULL THEN
    UPDATE public.marketplace_listings
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_listing_id;
  END IF;

  UPDATE public.marketplace_listings
  SET orders_count = COALESCE(orders_count, 0) + 1
  WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'total_price', v_total_price,
    'seller_id', v_listing.seller_id,
    'listing_title', v_listing.title
  );
END;
$$;

-- 4. RPC to confirm payment and update order status
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id uuid,
  p_payment_provider text DEFAULT 'mpesa',
  p_payment_reference text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order public.marketplace_orders;
BEGIN
  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.status != 'pending' THEN RAISE EXCEPTION 'Order is not pending'; END IF;

  UPDATE public.marketplace_orders
  SET status = 'confirmed', payment_provider = p_payment_provider,
      payment_reference = COALESCE(p_payment_reference, payment_reference),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'confirmed');
END;
$$;

-- 5. RPC to cancel order (with stock restoration)
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_order public.marketplace_orders;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_order FROM public.marketplace_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF v_order.buyer_id != v_user_id AND v_order.seller_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_order.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot cancel order in current status';
  END IF;

  UPDATE public.marketplace_orders
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_order_id;

  UPDATE public.marketplace_listings
  SET stock_quantity = COALESCE(stock_quantity, 0) + v_order.quantity,
      orders_count = GREATEST(COALESCE(orders_count, 0) - 1, 0)
  WHERE id = v_order.listing_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'status', 'cancelled');
END;
$$;
