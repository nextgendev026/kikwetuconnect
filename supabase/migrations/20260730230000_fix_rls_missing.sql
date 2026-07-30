-- Enable RLS on new tables created by 20260730220000_fix_all_errors.sql

ALTER TABLE IF EXISTS public.nyumba_kumi_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nyumba_kumi_trusted ENABLE ROW LEVEL SECURITY;

-- nyumba_kumi_confirmations: users can read confirmations on alerts they can see
DROP POLICY IF EXISTS nkc_select_own ON public.nyumba_kumi_confirmations;
CREATE POLICY nkc_select_own ON public.nyumba_kumi_confirmations
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.nyumba_kumi_group_members ngm
      JOIN public.nyumba_kumi_alerts na ON na.id = alert_id
      JOIN public.nyumba_kumi_groups ng ON ng.id = ngm.group_id
      WHERE ngm.user_id = auth.uid()
        AND (ng.county = na.county OR ng.county IS NULL)
    )
  );

-- nyumba_kumi_confirmations: authenticated users can insert their own
DROP POLICY IF EXISTS nkc_insert_own ON public.nyumba_kumi_confirmations;
CREATE POLICY nkc_insert_own ON public.nyumba_kumi_confirmations
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- nyumba_kumi_trusted: users see their own trusted relationships
DROP POLICY IF EXISTS nkt_select_own ON public.nyumba_kumi_trusted;
CREATE POLICY nkt_select_own ON public.nyumba_kumi_trusted
  FOR SELECT USING (user_id = auth.uid());

-- nyumba_kumi_trusted: users can manage their own trusted list
DROP POLICY IF EXISTS nkt_insert_own ON public.nyumba_kumi_trusted;
CREATE POLICY nkt_insert_own ON public.nyumba_kumi_trusted
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS nkt_delete_own ON public.nyumba_kumi_trusted;
CREATE POLICY nkt_delete_own ON public.nyumba_kumi_trusted
  FOR DELETE USING (user_id = auth.uid());
