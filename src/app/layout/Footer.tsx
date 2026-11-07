import { Link } from 'react-router'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner container">
        <div><Link to="/" className="footer-brand">BoSo</Link><p>교통카드 혜택을 놓치지 않도록.</p></div>
        <p>정책 적용 조건과 기한은 공식 안내를 확인해 주세요.</p>
        <small>© {new Date().getFullYear()} BoSo</small>
      </div>
    </footer>
  )
}
