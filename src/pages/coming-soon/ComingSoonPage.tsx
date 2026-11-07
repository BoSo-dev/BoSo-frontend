import Badge from '../../shared/ui/Badge'
import Card from '../../shared/ui/Card'
import { LinkButton } from '../../shared/ui/Button'
import EmptyState from '../../shared/ui/EmptyState'
import PageHeading from '../../shared/ui/PageHeading'
import type { IconName } from '../../shared/ui/Icon'

export default function ComingSoonPage({ title, description, icon }:
  { title: string; description: string; icon: IconName }) {
  return (
    <>
      <PageHeading title={title} description={description} />
      <Card>
        <Badge tone="neutral">준비 중</Badge>
        <EmptyState title="조금만 기다려 주세요" description="더 편리하게 이용하실 수 있도록 준비하고 있어요."
          icon={icon} action={<LinkButton to="/" variant="secondary">홈으로 이동</LinkButton>} />
      </Card>
    </>
  )
}
