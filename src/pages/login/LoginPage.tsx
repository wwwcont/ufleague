import { useForm } from 'react-hook-form'
import { PageContainer } from '../../layouts/containers/PageContainer'

type LoginForm = { email: string; password: string }

export const LoginPage = () => {
  const { register, handleSubmit } = useForm<LoginForm>()

  return (
    <PageContainer>
      <form onSubmit={handleSubmit(() => undefined)} className="mx-auto max-w-md space-y-3 border-y border-accentYellow/70 p-4">
        <h2 className="text-lg font-semibold">Вход</h2>
        <input {...register('email')} className="h-11 w-full border-b border-accentYellow/40 bg-transparent px-3" placeholder="Эл. почта" />
        <input type="password" {...register('password')} className="h-11 w-full border-b border-accentYellow/40 bg-transparent px-3" placeholder="Пароль" />
        <button className="h-11 w-full border-b border-accentYellow text-accentYellow">Войти</button>
      </form>
    </PageContainer>
  )
}
