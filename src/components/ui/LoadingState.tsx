export const LoadingState = ({ title = 'Загрузка...' }: { title?: string }) => (
  <div className="matte-panel p-6 text-center">
    <p className="text-sm text-textMuted">{title}</p>
  </div>
)
