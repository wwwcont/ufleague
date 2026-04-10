import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { PageContainer } from '../../layouts/containers/PageContainer'

export const AppRouteError = () => {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unexpected application error'

  return (
    <PageContainer>
      <section className="rounded-2xl border border-borderStrong bg-panelBg p-4 shadow-matte">
        <h2 className="text-xl font-bold text-textPrimary">Что-то пошло не так</h2>
        <p className="mt-2 text-sm text-rose-300">{message}</p>
        <Link
          to="/"
          className="mt-4 inline-flex rounded-lg border border-borderSubtle px-3 py-2 text-xs text-textSecondary hover:border-borderStrong"
        >
          Вернуться на главную
        </Link>
      </section>
    </PageContainer>
  )
}
