import { Link } from 'react-router-dom'
import { HeroBlock } from '../../components/ui/HeroBlock'

export const HomeSummary = () => (
  <HeroBlock title="Кубок UFL 2026" subtitle="Мобильный центр матчей: эфир, расписание, таблица и плей-офф.">
    <div className="grid grid-cols-3 gap-2 text-xs sm:w-fit sm:grid-cols-3">
      <Link className="border-b border-accentYellow/60 px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/matches">Матчи</Link>
      <Link className="border-b border-accentYellow/60 px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/table">Таблица</Link>
      <Link className="border-b border-accentYellow/60 px-3 py-2 text-center font-medium text-textSecondary hover:border-accentYellow hover:text-textPrimary" to="/bracket">Сетка</Link>
    </div>
  </HeroBlock>
)
