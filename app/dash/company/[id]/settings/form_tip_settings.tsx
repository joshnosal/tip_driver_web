'use client'

import { CompanyProps } from '@/lib/database/models/company'
import { useState, useContext, useRef, useEffect } from 'react'
import { Button, Form, InputNumber, Checkbox } from 'antd'
import { CloseOutlined, DeleteOutlined } from '@ant-design/icons'
import api from '@/utils/API'
import { getErrorMessage } from '@/utils/ErrorHandler'
import { AppContext } from '@/utils/AppContext'

export default function TipSettingsForm({ company }: { company: CompanyProps}){
  const { message, Authorization } = useContext(AppContext)
  const [ tipLevels, setTipLevels ] = useState(company.tip_levels)
  const tipLevelsRef = useRef(tipLevels)
  const [ customTip, setCustomTip ] = useState(company.custom_tip)
  const customTipRef = useRef(customTip)

  useEffect(() => {
    tipLevelsRef.current = tipLevels
    customTipRef.current = customTip
  }, [tipLevels, customTip])

  const saveChanges = async () => {
    try {
      company.tip_levels = tipLevelsRef.current
      company.custom_tip = customTipRef.current
      await api.post<{company: CompanyProps, fields: (keyof CompanyProps)[]}, undefined>({
        url: process.env.NEXT_PUBLIC_API_URL + '/company/update',
        body: {
          company,
          fields: ['tip_levels', 'custom_tip']
        },
        headers: {
          companyId: company._id,
          Authorization
        }
      })
    } catch(e) {
      message('Failed to save changes', 'error')
    }
  }

  const handleChange = (index: number, val: number | null) => {
    let clone = [...tipLevels]
    clone = [...clone.slice(0,index), val || 0, ...clone.slice(index+1)]
    setTipLevels(clone)
  }

  const deleteLevel = (index: number) => () => {
    let clone = [...tipLevels]
    clone = [...clone.slice(0,index), ...clone.slice(index+1)]
    setTipLevels(clone)
    setTimeout(saveChanges, 500)
  }

  const addLevel = () => {
    let len = tipLevels.length
    setTipLevels([...tipLevels, tipLevels[len - 1]])
    setTimeout(saveChanges, 500)
  }

  const toggleCustomTip = () => {
    setCustomTip(!customTip)
    setTimeout(saveChanges, 500)
  }

  return(
    <div className='flex flex-col space-y-5' style={{ maxWidth: 400}}>
      <Checkbox
        checked={customTip}
        onChange={toggleCustomTip}
      >Accept custom tip amounts</Checkbox>
      {tipLevels.map((level, index) => (
        <Form.Item
          label={`Tier ${index+1}`}
          key={index}
        >
          <Form.Item noStyle>
            <InputNumber
              addonAfter='$'
              value={level}
              onChange={e => handleChange(index, e)}
              style={{ width: 100 }}
              onBlur={saveChanges}
            />
          </Form.Item>
          <Button
            icon={<CloseOutlined/>}
            onClick={deleteLevel(index)}
            className='ml-2'
            danger
          />
        </Form.Item>
        // <div>
        //   {`Level ${index+1}`}
        // </div>
      ))}
      <Button
        className='self-start'
        onClick={addLevel}
      >Add Tier</Button>
    </div>
  )
}