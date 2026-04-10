export const ErrorState = ({ title = 'Ошибка', subtitle = 'Не удалось загрузить данные.' }: { title?: string; subtitle?: string }) => (
  <div className="matte-panel p-6 text-center">
    <p className="text-base font-semibold text-statusLive">{title}</p>
    <p className="mt-1 text-sm text-textMuted">{subtitle}</p>
  </div>
)
