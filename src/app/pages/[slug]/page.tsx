import { redirect } from 'next/navigation'

export default function PageSlugRedirect({ params }: { params: { slug: string } }) {
  redirect(`/spaces/${params.slug}`)
}
