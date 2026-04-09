import { Link } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'

export const ProfilePage = () => (
  <PageContainer>
    <section className="rounded-2xl bg-gradient-to-r from-accentYellow/20 to-transparent p-5">
      <h2 className="text-base font-semibold uppercase tracking-[0.1em]">Личный кабинет</h2>
      <p className="mt-2 text-sm text-textSecondary">Скоро здесь появится профиль. Пока доступен только вход или регистрация.</p>
      <div className="mt-4 flex gap-2">
        <Link to="/login" className="rounded-xl bg-accentYellow/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-app">Вход</Link>
        <Link to="/login" className="rounded-xl bg-elevated px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-textSecondary">Регистрация</Link>
      </div>
    </section>
  </PageContainer>
)
