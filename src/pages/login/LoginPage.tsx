import { useForm } from 'react-hook-form'
import { PageContainer } from '../../layouts/containers/PageContainer'

type LoginForm = { email: string; password: string }

export const LoginPage = () => {
  const { register, handleSubmit } = useForm<LoginForm>()

  return (
    <PageContainer>
      <form onSubmit={handleSubmit(() => undefined)} className="mx-auto max-w-md space-y-3 rounded-xl border border-borderSubtle bg-surface p-4">
        <h2 className="text-lg font-semibold">Login</h2>
        <input {...register('email')} className="h-11 w-full rounded border border-borderSubtle bg-app px-3" placeholder="Email" />
        <input type="password" {...register('password')} className="h-11 w-full rounded border border-borderSubtle bg-app px-3" placeholder="Password" />
        <button className="h-11 w-full rounded border border-accentYellow text-accentYellow">Sign in</button>
      </form>
    </PageContainer>
  )
}
