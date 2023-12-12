
import { Button } from 'antd'

export default function Home() {
  return (
    <div className='flex flex-col items-center justify-center w-screen h-screen space-y-10'>
      <div className='text-3xl font-bold'>Welcome to Tip Driver</div>
      <Button type='primary' href='/dash' size='large'>Enter</Button>
    </div>
  )
}
