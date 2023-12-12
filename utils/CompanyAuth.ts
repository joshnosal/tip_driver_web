import Company, { CompanyDocument } from '@/lib/database/models/company'
import { ErrorTypes } from './Options'


const checkCompanyAuth = async (companyId?: string, userId?: string, role?: 'admin'|'basic_user'): Promise<CompanyDocument> => {
  if(!companyId || !userId) throw new Error(ErrorTypes.NoAuth)
  if(role === 'admin') {
    let company = await Company.findOne({$and: [
      { _id: companyId },
      { admins: userId }
    ]})
    if(!company) throw new Error(ErrorTypes.NoAuth)
    return company
  } else {
    let company = await Company.findOne({$and: [
      { _id: companyId },
      {$or: [
        { admins: userId },
        { basic_users: userId }
      ]}
    ]})
    if(!company) throw new Error(ErrorTypes.NoAuth)
    return company
  }
  
  
}

export default checkCompanyAuth