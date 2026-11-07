import Card from '../../shared/ui/Card'
import EmptyState from '../../shared/ui/EmptyState'
import { LinkButton } from '../../shared/ui/Button'

export default function NotFoundPage() {
  return (
    <Card className="not-found">
      <h1>페이지를 찾을 수 없습니다.</h1>
      <EmptyState title="주소를 다시 확인해 주세요" description="입력하신 주소가 변경되었거나 존재하지 않는 페이지예요."
        action={<LinkButton to="/">홈으로 이동</LinkButton>} />
    </Card>
  )
}
