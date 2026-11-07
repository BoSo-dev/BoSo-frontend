import guide from '../../shared/assets/boso-guide.png'
import Badge from '../../shared/ui/Badge'
import Card from '../../shared/ui/Card'
import Icon from '../../shared/ui/Icon'
import { LinkButton } from '../../shared/ui/Button'

export default function HomePage() {
  return (
    <>
      <div className="intro-grid">
        <section className="welcome" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="eyebrow">YOUR TRANSIT POLICY ASSISTANT</p>
            <h1 id="welcome-title">교통카드 혜택을 놓치지 않도록,<br />BoSo가 함께 살펴볼게요.</h1>
            <p className="welcome-description">흩어진 교통 정책은 한곳에서 확인하고,<br />내 상황에 맞는 확인 목록을 관리해 보세요.</p>
          </div>
          <img className="welcome-character" src={guide} alt="" width="155" height="155" />
        </section>
        <Card className="intro-aside" aria-labelledby="intro-title">
          <Badge>교통카드 관리 서비스</Badge>
          <h2 id="intro-title">복잡한 정책도, <br />나에게 필요한 정보부터.</h2>
          <p>정책 확인부터 해야 할 일까지 <br />BoSo와 차근차근 살펴보세요.</p>
          <LinkButton to="/policies" variant="subtle">정책 메뉴 둘러보기 <Icon name="arrow" /></LinkButton>
        </Card>
      </div>
      <section aria-labelledby="service-title" className="service-section">
        <div className="section-heading"><div><h2 id="service-title">BoSo와 함께할 교통 생활</h2>
          <p>필요한 정보를 더 쉽게 확인할 수 있도록 준비하고 있어요.</p></div><Badge tone="neutral">준비 중</Badge></div>
        <div className="service-grid">
          <Card aria-labelledby="policy-title"><span className="service-icon"><Icon name="policy" /></span>
            <h3 id="policy-title">교통 정책 간편 요약</h3><p>여러 곳에 흩어진 교통 정책과 <br />변경사항을 한곳에서 살펴보세요.</p>
            <LinkButton to="/policies" variant="subtle">정책 변경 <Icon name="arrow" /></LinkButton></Card>
          <Card aria-labelledby="todo-title"><span className="service-icon"><Icon name="todo" /></span>
            <h3 id="todo-title">나에게 필요한 To-Do</h3><p>내 상황에 맞는 확인 목록으로 <br />해야 할 일을 놓치지 마세요.</p>
            <LinkButton to="/todos" variant="subtle">To-Do <Icon name="arrow" /></LinkButton></Card>
          <Card aria-labelledby="chat-title"><span className="service-icon"><Icon name="chat" /></span>
            <h3 id="chat-title">궁금할 땐 AI 챗봇</h3><p>어려운 교통 정책과 카드 정보, <br />궁금한 내용을 물어보세요.</p>
            <LinkButton to="/chat" variant="subtle">AI 챗봇 <Icon name="arrow" /></LinkButton></Card>
        </div>
      </section>
    </>
  )
}
