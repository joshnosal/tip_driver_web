'use client'
import { Input, Form, Divider, Button } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useEffect, useState, useContext } from 'react'
import { CompanyProps } from '@/lib/database/models/company'
import api from '@/utils/API'
import { AppContext } from '@/utils/AppContext'
import { getErrorMessage } from '@/utils/ErrorHandler'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function NewCompanyPage(){
  const { message, addCompany, updateCompany, companies } = useContext(AppContext)
  const [ loading, setLoading ] = useState<boolean>(false)
  const [ complete, setComplete ] = useState<boolean>(true)
  const [ company, setCompany ] = useState<Partial<CompanyProps> & {admins: string[], basic_users: string[]}>({
    admins: [],
    basic_users: []
  })
  const router = useRouter()
  const { getToken } = useAuth()

  const createCompany = async () => {
    setLoading(true)
    try {
      let newCo = await api.post<Partial<CompanyProps>,CompanyProps>({ 
        url: process.env.NEXT_PUBLIC_API_URL + '/company/new', 
        body: company,
        headers: { Authorization: `Bearer ${await getToken()}` }
    })
      addCompany(newCo)
      updateCompany(newCo)
      router.replace('/dash/company/'+newCo._id+'/settings')
    } catch(e) {
      let msg = getErrorMessage(e)
      message(msg, 'error')
    }
  }

  useEffect(() => {
    if(!company.name) return setComplete(false)
    if(company.admins) {
      for(const admin of company.admins) {
        if(!admin || company.basic_users.includes(admin)) return setComplete(false)
      }
      for(const basicUser of company.basic_users) {
        if(!basicUser || company.admins.includes(basicUser)) return setComplete(false)
      }
    }
    setComplete(true)
  }, [company])

  return(
    <div className='grow flex flex-col overflow-hidden relative p-5'>
      <div className='grow bg-white rounded-lg p-10 overflow-hidden flex flex-col'>
        <div className='text-xl font-semibold mb-10 flex justify-between'>
          New Company
          <div className='flex gap-2'>
            <Button
              type='default'
              onClick={() => router.back()}
              disabled={!companies.length}
            >
              Back
            </Button>
            <Button 
              type='primary' 
              onClick={createCompany}
              loading={loading}
              disabled={!complete}
            >
              Create
            </Button>
          </div>
          
        </div>
        <Form 
          layout='vertical' 
          className='overflow-y-auto grow'
        >
          <Divider orientation='left' orientationMargin={0}>Details</Divider>
          <div className='pl-5 mb-10'>
            <Form.Item 
              label='Name'
              hasFeedback
              style={{ maxWidth: 400 }}
              validateStatus={!company.name ? 'error' : 'success'}
            >
              <Input
                style={{ width: '80%' }}
                placeholder='Name...'
                value={company.name || ''}
                maxLength={40}
                onChange={e => setCompany({...company, name: e.target.value})}
              />
            </Form.Item>
          </div>
          <div className='flex gap-5'>
            <div className='flex flex-col shrink-0 grow basis-1'>
              <Divider orientation='left' orientationMargin={0}>Administrators</Divider>
              <div className='pl-5'>
                {company.admins.map((user, index) => (
                  <Form.Item
                    required={false}
                    style={{ maxWidth: 400 }}
                    key={index+'container'}
                    validateStatus={!user ? 'error' : company.basic_users.includes(user) ? 'error' : user ? 'success' : 'validating'}
                    help={!user ? 'Please enter email' : company.basic_users.includes(user) ? 'Email already included in General' : ''}
                  >
                    <Form.Item
                      validateStatus={!user ? 'error' : company.basic_users.includes(user) ? 'error' : user ? 'success' : 'validating'}
                      noStyle
                    >
                      <Input 
                        placeholder='Email...'
                        key={index+'input'}
                        style={{ width: '80%' }}
                        value={user}
                        onChange={e => {
                          setCompany({...company, admins: [...company.admins.slice(0,index), e.target.value, ...company.admins.slice(index + 1)] })
                        }}
                      />
                    </Form.Item>
                    <Button
                      onClick={() => {
                        setCompany({...company, admins: [...company.admins.slice(0,index), ...company.admins.slice(index + 1)] })
                      }}
                      icon={<DeleteOutlined/>}
                      className='ml-2'
                    />
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    icon={<PlusOutlined/>}
                    onClick={() => {
                      setCompany({ ...company, admins: [...company.admins, '']})
                    }}
                  >Add Administrator</Button>
                </Form.Item>
              </div>
            </div>
            <div className='flex flex-col shrink-0 grow basis-1'>
              <Divider orientation='left' orientationMargin={0}>General Users</Divider>
              <div className='pl-5'>
                {company.basic_users.map((user, index) => (
                  <Form.Item
                    required={false}
                    style={{ maxWidth: 400 }}
                    key={index+'container'}
                    validateStatus={!user ? 'error' : company.admins.includes(user) ? 'error' : user ? 'success' : 'validating'}
                    help={!user ? 'Please enter email' : company.admins.includes(user) ? 'Email already included in Adminstrators' : ''}
                  >
                    <Form.Item
                      validateStatus={!user ? 'error' : company.admins.includes(user) ? 'error' : user ? 'success' : 'validating'}
                      noStyle
                    >
                      <Input 
                        placeholder='Email...'
                        key={index+'input'}
                        style={{ width: '80%' }}
                        value={user}
                        onChange={e => {
                          setCompany({...company, basic_users: [...company.basic_users.slice(0,index), e.target.value, ...company.basic_users.slice(index + 1)] })
                        }}
                      />
                    </Form.Item>
                    <Button
                      onClick={() => {
                        setCompany({...company, basic_users: [...company.basic_users.slice(0,index), ...company.basic_users.slice(index + 1)] })
                      }}
                      icon={<DeleteOutlined/>}
                      className='ml-2'
                    />
                  </Form.Item>
                ))}
                <Form.Item>
                  <Button
                    icon={<PlusOutlined/>}
                    onClick={() => {
                      setCompany({ ...company, basic_users: [...company.basic_users, '']})
                    }}
                  >Add General User</Button>
                </Form.Item>
              </div>
            </div>
          </div>
        </Form>
      </div>
    </div>
  )
}