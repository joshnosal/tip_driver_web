'use client'
import type { CompanyProps } from '@/lib/database/models/company'
import type { User } from '@clerk/nextjs/api'
import type { NoticeType } from 'antd/es/message/interface';
import React from 'react'
import { message, ConfigProvider, theme, ThemeConfig } from 'antd';

export interface AppContextProps {
  companies: CompanyProps[]
  // company: CompanyProps|null
  updateCompany: (c: CompanyProps) => void
  addCompany: (c: CompanyProps) => void
  user: User|null
  message: (content: string, type: NoticeType) => void
}

interface InitialStateProps {
  companies: CompanyProps[]
  user: User|null
  // company: CompanyProps|null
}

const reducer = (s: InitialStateProps, a: object) => ({...s, ...a})

const customTheme: ThemeConfig = {}



export const AppContext = React.createContext<AppContextProps>({} as AppContextProps)

export default function AppContextProvider(props: {
  children: React.ReactNode
  companies: CompanyProps[]
  user: User|null
}){
  const [ messageApi, contextHolder ] = message.useMessage()
  const [ state, dispatch ] = React.useReducer(reducer, {
    companies: props.companies,
    user: props.user,
  })

  const appContext = React.useMemo<AppContextProps>(() => ({
    ...state,
    updateCompany: (u) => dispatch({ company: u}),
    addCompany: (c) => dispatch({ companies: [...state.companies, c]}),
    message: (content, type) => messageApi.open({content, type})
  }), [state])

  return (
    <ConfigProvider theme={customTheme}>
      <AppContext.Provider value={appContext}>
        {contextHolder}
        {props.children}
      </AppContext.Provider>
    </ConfigProvider>
  )

}