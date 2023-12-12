'use client'

import type { CompanyProps } from '@/lib/database/models/company'
import type { User } from '@clerk/nextjs/api'
import type { BasicUser, UserWithRole } from './page'
import type { InputRef } from 'antd';
import { Button, Input, Space, Table, Select, Popconfirm } from 'antd';
import type { ColumnType, ColumnsType } from 'antd/es/table';
import type { FilterConfirmProps } from 'antd/es/table/interface';
import React, { useRef, useState, useEffect, useContext } from 'react';
import { SearchOutlined, CheckCircleTwoTone, CloseCircleTwoTone } from '@ant-design/icons';
import api from '@/utils/API';
import { getErrorMessage } from '@/utils/ErrorHandler';
import { AppContext } from '@/utils/AppContext';
import clerkTools from '@/lib/clerk/tools';
import { useRouter } from 'next/navigation'

type Props = {
  company: CompanyProps
  users: BasicUser[]
  userId: string
}

type DataIndex = keyof BasicUser


export default function UserDisplay({ company, users, userId }: Props){
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const searchInput = useRef<InputRef>(null);
  const containerRef = useRef<HTMLDivElement>(null)
  const [tableHeight, setTableHeight] = useState<number>(0)
  const [ data, setData ] = useState<BasicUser[]>(users)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [newUser, setNewUser] = useState<BasicUser|void>()
  const [loading, setLoading] = useState<string|void>()
  const { message, Authorization } = useContext(AppContext)
  const router = useRouter()

  useEffect(() => {
    const handleResize = () => {
      if(!containerRef.current) return
      setTableHeight(containerRef.current.clientHeight - containerRef.current.getElementsByClassName('ant-table-thead')[0].clientHeight)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setData(users)
  }, [users])

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const handleSearch = (
    selectedKeys: string[],
    confirm: (param?: FilterConfirmProps) => void,
    dataIndex: DataIndex,
  ) => {
    confirm();
    setSearchText(selectedKeys[0]);
    setSearchedColumn(dataIndex);
  };

  const getColumnSearchProps = (dataIndex: DataIndex): ColumnType<BasicUser> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          ref={searchInput}
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => handleSearch(selectedKeys as string[], confirm, dataIndex)}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            size="small"
            type='primary'
            onClick={() => {
              confirm({ closeDropdown: false });  
              setSearchText((selectedKeys as string[])[0]);
              setSearchedColumn(dataIndex);
            }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              setSearchText('')
              setSelectedKeys([])
              handleSearch([], confirm, dataIndex)
            }}
            size="small"
          >
            Clear
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              close();
            }}
          >
            Close
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex]
        .toString()
        .toLowerCase()
        .includes((value as string).toLowerCase()),
    onFilterDropdownOpenChange: (visible) => {
      if (visible) {
        setTimeout(() => searchInput.current?.select(), 100);
      }
    },
  });

  const roleChange = (id: string) => async (e: 'Admin'|'User') => {
    let clone = [...data]
    for(const datum of clone) {
      if(id === datum.key) {
        datum.role = e
      }
    }
    setData(clone)
    try {
      await api.get({
        url: process.env.NEXT_PUBLIC_API_URL + (e === 'Admin' ? '/company/promote_user' : '/company/demote_user'),
        headers: {
          companyId: company._id,
          userId: id,
          Authorization
        }
      })
    } catch(err) {
      for(const datum of clone) {
        if(id === datum.key) {
          datum.role = e === 'Admin' ? 'User' : 'Admin'
        }
      }
    }
  }

  const columns: ColumnsType<BasicUser> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      // width: 300,
      ...getColumnSearchProps('email'),
      sorter: (a, b) => a.email > b.email ? 1 : a.email < b.email ? -1 : 0,
      sortDirections: ['descend', 'ascend'],
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      // width: 200,
      // ...getColumnSearchProps('role'),
      sorter: (a, b) => a.role > b.role ? 1 : a.role < b.role ? -1 : 0,
      render: (v, r) => (
        <Select
          options={[
            { label: 'Admin', value: 'Admin' },
            { label: 'User', value: 'User' }
          ]}
          disabled={r.key === userId}
          value={v}
          onChange={roleChange(r.key)}
          style={{ width: 100 }}
        />
      )
    },
    {
      title: 'Registered',
      dataIndex: 'accepted',
      key: 'accepted',
      align: 'center',
      render: v => {
        return v ? <CheckCircleTwoTone twoToneColor='#52c41a' style={{ fontSize: 20 }}/> : <CloseCircleTwoTone twoToneColor='red' style={{ fontSize: 20 }}/>
      }
    },
    {
      title: 'Last Login',
      dataIndex: 'lastSignInAt',
      key: 'lastSignInAt',
      // width: 300,
      sorter: (a, b) => a.lastSignInAt - b.lastSignInAt,
      sortDirections: ['descend', 'ascend'],
      render: (v) => <div>{v ? new Date(v).toDateString() : '-'}</div>
    },
    {
      title: '',
      key: '',
    }
  ];

  const addNewUser = async () => {
    try {
      setLoading('addNew')
      if(!newUser) throw new Error('Missing information')
      for(const item of data) {
        if(item.email === newUser.email) throw new Error('User already exists')
      }

      let { user } = await api.post<BasicUser, {user: User|undefined}>({
        url: process.env.NEXT_PUBLIC_API_URL + '/company/add_user',
        body: newUser,
        headers: {
          companyId: company._id,
          Authorization
        }
      })
      let temp: BasicUser = {
        key: user ? user.id : newUser.email,
        role: newUser.role,
        accepted: false,
        lastSignInAt: user && user.lastSignInAt ? user.lastSignInAt : 0,
        email: user ? clerkTools.getPrimaryEmail(user) : newUser.email
      }
      setData([...data, temp])
      setNewUser()
      router.refresh()
    } catch(e) {
      let msg = getErrorMessage(e)
      message(msg, 'error')
    }
    setLoading('')
  }

  const deleteUsers = async () => {
    try {
      setLoading('delete')
      await api.post<React.Key[], undefined>({
        url: process.env.NEXT_PUBLIC_API_URL + '/company/remove_users',
        body: selectedRowKeys,
        headers: {
          companyId: company._id,
          Authorization
        }
      })
      let selection = [...selectedRowKeys].filter(i => i !== userId)
      setData(data.filter(i => !selection.includes(i.key)))
      setSelectedRowKeys([])
    } catch(e) {
      let msg = getErrorMessage(e)
      message(msg, 'error')
    }
    setLoading('')
  }

  return (
    <div className='p-5 flex grow overflow-hidden'>
      <div className='bg-white rounded-lg grow p-5 overflow-y-hidden overflow-x-auto flex flex-col' ref={containerRef}>
        <div className='flex gap-2 justify-start pb-5'>
          {newUser ? (
            <>
            <Input
              value={newUser.email}
              onChange={e => setNewUser({...newUser, email: e.target.value })}
              placeholder='Email...'
              style={{ width: 250 }}
              maxLength={40}
            />
            <Select
              value={newUser.role}
              options={[
                { label: 'Admin', value: 'Admin' },
                { label: 'User', value: 'User' }
              ]}
              onChange={e => setNewUser({...newUser, role: e})}
              style={{ width: 90 }}
            />
            <Button
              disabled={Boolean(!newUser.email || !newUser.role)}
              onClick={addNewUser}
              type='primary'
              loading={loading === 'addNew'}
            >
              Add
            </Button>
            <Button
              onClick={() => setNewUser()}
            >Cancel</Button>
            </>
          ) : (
            <Button
              type='primary'
              onClick={() => setNewUser({key: 'new', email: '', role: 'User', lastSignInAt: 0, accepted: false })}
            >New</Button>
          )}
          <Popconfirm
            onConfirm={deleteUsers}
            okText='Yes'
            cancelText='No'
            title='Are you sure?'
            description='This action cannnot be undone.'
          >
            <Button
              danger
              disabled={Boolean(!selectedRowKeys.length)}
            >Delete</Button>
          </Popconfirm>
        </div>
        <Table 
          columns={columns} 
          dataSource={data}
          size='small'
          // virtual
          pagination={{
            pageSize: 10
          }}
          // scroll={{ y: tableHeight+10, x: 1000 }}
          // style={{ maxHeight: tableHeight }}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: onSelectChange
          }}
          // tableLayout='fixed'
        />
      </div>
    </div>
  )
}