import { Link, useParams } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'

const sectionMeta: Record<string, { title: string; description: string }> = {
  activity: { title: 'Моя активность', description: 'Комментарии, реакции и последние действия пользователя (skeleton).' },
  edit: { title: 'Редактирование профиля', description: 'Поля профиля и настройки видимости (skeleton).' },
  team: { title: 'Моя команда', description: 'Управление составом и приглашениями (skeleton).' },
  moderation: { title: 'Модерация', description: 'Панель модерации и турнирных действий (skeleton).' },
  permissions: { title: 'Права и роли', description: 'Управление RBAC и пользовательскими разрешениями (skeleton).' },
  settings: { title: 'Глобальные настройки', description: 'Параметры платформы и advanced actions (skeleton).' },
}

export const CabinetSectionPage = () => {
  const { section } = useParams()
  const meta = section ? sectionMeta[section] : null

  if (!meta) {
    return (
      <PageContainer>
        <section className="matte-panel p-4">
          <h2 className="text-lg font-semibold">Раздел не найден</h2>
          <Link to="/profile" className="mt-3 inline-flex text-sm text-accentYellow">Вернуться в кабинет</Link>
        </section>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <section className="matte-panel p-4">
        <h2 className="text-lg font-semibold text-textPrimary">{meta.title}</h2>
        <p className="mt-2 text-sm text-textSecondary">{meta.description}</p>
        <p className="mt-3 text-xs text-textMuted">Backend integration будет подключен в следующем этапе.</p>
        <Link to="/profile" className="mt-4 inline-flex text-sm text-accentYellow">← Назад в ЛК</Link>
      </section>
    </PageContainer>
  )
}
