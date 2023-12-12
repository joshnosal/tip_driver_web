import { NextRequest, NextResponse } from 'next/server'
import type { NextApiRequest, NextApiResponse } from 'next'
import { clerkClient, currentUser } from '@clerk/nextjs'
import { headers } from 'next/headers'
import type { User } from '@clerk/nextjs/api'
import { sendErrorToClient } from '@/utils/ErrorHandler'
import { ErrorTypes } from '@/utils/Options'
import Company, { CompanyDocument, CompanyProps } from '@/lib/database/models/company'
import stripe from '@/lib/stripe'
import checkCompanyAuth from '@/utils/CompanyAuth'
import clerkTools from '@/lib/clerk/tools'
import { BasicUser } from '@/app/dash/company/[id]/users/page'
import Device, { DeviceDocument, DeviceProps } from '@/lib/database/models/device'

const createCompany = async (data: Partial<CompanyProps>, user: User): Promise<CompanyDocument> => {

  if(!data.name || !Array.isArray(data.admins) || !Array.isArray(data.basic_users)) throw new Error(ErrorTypes.MissingFields)

  let company = await new Company({
    name: data.name,
    admins: [user.id],
    invites: {
      admins: data.admins,
      basic_users: data.basic_users
    }
  }).save()

  let customer = await stripe.createCustomer({
    email: clerkTools.getPrimaryEmail(user),
    name: data.name,
    metadata: {
      tip_driver_id: company._id.toString()
    }
  })

  company.stripe_customer_id = customer.id
  await company.save()

  
  let invites = await clerkClient.invitations.getInvitationList()
  
  const addUserToCompany = async (userId: string, email: string, type: 'admin'|'basic_user') => {
    if(userId === user.id) return
    if(type === 'admin') {
      await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {admins: userId}, $pull: {'invites.admins': email} })
    } else {
      await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {basic_users: userId}, $pull: {'invites.basic_users': email} })
    }
  }
  
  const revokeInvite = async (email: string) => {
    for(const invite of invites) {
      if(invite.emailAddress === email && invite.status === 'pending') {
        return await clerkClient.invitations.revokeInvitation(invite.id)
      }
    }
  }


  // Invite admins
  let emails = data.admins
  for(const email of emails) {
    try {
      let users = await clerkClient.users.getUserList({ emailAddress: [email]})
      if(users.length) {
        await addUserToCompany(users[0].id, email, 'admin')
      } else {
        await revokeInvite(email)
        await clerkClient.invitations.createInvitation({ emailAddress: email })
      }
    } catch(e) {
      console.log(e)
    }
  }
  
  // Invite basic users
  emails = data.basic_users
  for(const email of emails) {
    try {
      let users = await clerkClient.users.getUserList({ emailAddress: [email]})
      if(users.length) {
        await addUserToCompany(users[0].id, email, 'basic_user')
      } else {
        await revokeInvite(email)
        await clerkClient.invitations.createInvitation({ emailAddress: email })
      }
    } catch(e) {
      console.log(e)
    }
  }

  return company

}

const updateCompany = async (data: { company: CompanyProps, fields: (keyof CompanyProps)[] }, user: User): Promise<CompanyDocument> => {
  let company = await checkCompanyAuth(data.company._id, user.id, 'admin')
  for(const key of data.fields) {
    switch(key) {
      case 'tip_levels':
        company.tip_levels = data.company.tip_levels
        break;
      case 'custom_tip': 
        company.custom_tip = data.company.custom_tip
        break;
      default: continue
    }
  }
  return await company.save()
}

const changeUserRole = async (companyId: string, userId: string, user: User, dir: 'up'|'down') => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  if(userId === user.id) throw new Error(ErrorTypes.NoAuth)
  if(dir === 'up') {
    await Company.findOneAndUpdate({_id: company._id}, {
      $pull: {basic_users: userId},
      $addToSet: {admins: userId}
    })
  } else if(dir === 'down') {
    await Company.findOneAndUpdate({_id: company._id}, {
      $pull: {admins: userId},
      $addToSet: {basic_users: userId}
    })
  }
}

const removeUsers = async (companyId: string, userIds: string[], user: User) => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  userIds = userIds.filter(i => i !== user.id)
  await Company.findOneAndUpdate({_id: company._id}, {
    $pullAll: {
      admins: userIds,
      basic_users: userIds
    }
  })
  return
}

const addUser = async (companyId: string, newUser: BasicUser, user: User): Promise<User | undefined> => {
  let company = await checkCompanyAuth(companyId, user.id, 'admin')
  let invites = await clerkClient.invitations.getInvitationList()

  const addUserToCompany = async (userId: string, type: 'admin'|'basic_user') => {
    if(userId === user.id) return
    if(type === 'admin') {
      await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {admins: userId} })
    } else {
      await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {basic_users: userId} })
    }
  }

  const addUserToCompanyInvites = async (email: string, type: 'admin'|'basic_user') => {
    if(type === 'admin') {
      await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {'invites.admins': email} })
    } else {
      await Company.findOneAndUpdate({_id: company._id}, {$addToSet: {'invites.basic_users': email} })
    }
  }

  const revokeInvite = async (email: string) => {
    for(const invite of invites) {
      if(invite.emailAddress === email && invite.status === 'pending') {
        return await clerkClient.invitations.revokeInvitation(invite.id)
      }
    }
  }

  let users = await clerkClient.users.getUserList({ emailAddress: [newUser.email]})
  if(users.length) {
    await addUserToCompany(users[0].id, newUser.role === 'Admin' ? 'admin' : 'basic_user')
    return users[0]
  } else {
    await revokeInvite(newUser.email)
    await clerkClient.invitations.createInvitation({ emailAddress: newUser.email })
    await addUserToCompanyInvites(newUser.email, newUser.role === 'Admin' ? 'admin' : 'basic_user')
    return
  }
}

const getCompanies = async (user: User): Promise<CompanyDocument[]> => {
  let companies = await Company.find({$or: [
    { admins: user.id },
    { basic_users: user.id }
  ]}).lean()
  return companies
}

const getCompany = async (props: { companyId: string|null, user: User}): Promise<CompanyDocument|void|null> => {
  if(!props.companyId) return
  let company =  await checkCompanyAuth(props.companyId, props.user.id)
  return company
}

const getDevices = async (props: {companyId: string|null, user: User}) => {
  if(!props.companyId || props.companyId === 'null') throw new Error()
  let company = await checkCompanyAuth(props.companyId, props.user.id)
  if(!company) throw new Error()
  let devices = await Device.find({ company })
  return devices
}

const createDevice = async (props: { companyId: string, user: User, data: Partial<DeviceProps>}) => {
  let company = await checkCompanyAuth(props.companyId, props.user.id, 'admin')
  let device = await new Device({
    name: props.data.name,
    company: company._id,
    device_id: props.data.device_id,
    ip_address: props.data.ip_address
  }).save()
  company.devices.push(device._id)
  await company.save()
  return device
}

const getDevice = async (props: { companyId: string|null, user: User, deviceId: string|null }): Promise<DeviceDocument|void|null> => {
  if(!props.companyId || props.companyId === 'null' || !props.deviceId || props.deviceId === 'null') return
  let company = await checkCompanyAuth(props.companyId, props.user.id)
  let device = await Device.findOne({$and: [
    {company: company._id},
    {_id: props.deviceId}
  ]})
  return device
}


export const GET = async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  let headersList = headers()
  let user = await currentUser()
  if(!user) throw new Error(ErrorTypes.NoAuth)
  try {
    console.log(params.slug)

    if(params.slug === 'promote_user' || params.slug === 'demote_user') {
      
      let userId = headersList.get('userId')
      let companyId = headersList.get('companyId')
      if(!userId || !companyId) throw new Error(ErrorTypes.NoAuth)
      await changeUserRole(companyId, userId, user, params.slug === 'promote_user' ? 'up' : 'down')

    } else if (params.slug === 'companies') {

      return NextResponse.json(await getCompanies(user))

    } else if (params.slug === 'company') {

      let companyId = headersList.get('companyId')
      let company = await getCompany({companyId, user})
      return company ? NextResponse.json(company) : NextResponse.next()

    } else if (params.slug === 'devices') {

      let companyId = headersList.get('companyId')
      let devices = await getDevices({companyId, user})
      return devices ? NextResponse.json(devices) : NextResponse.next()

    } else if (params.slug === 'device') {

      let companyId = headersList.get('companyId')
      let deviceId = headersList.get('deviceId')
      // if(!deviceId || !companyId) throw new Error(ErrorTypes.NoAuth)
      let device = await getDevice({companyId, user, deviceId})
      return device ? NextResponse.json(device) : NextResponse.next()

    }

    return NextResponse.json({})
  } catch(e) {
    return sendErrorToClient(e)
  }
}

export const POST = async (
  req: NextRequest,
  { params }: { params: { slug: string } }
) => {
  try {
    let data = await req.json()
    let headersList = headers()
    let user = await currentUser()
    if(!user) throw new Error(ErrorTypes.NoAuth)
    let slug = params.slug

    if(slug === 'new') {
      return NextResponse.json(await createCompany(data, user))
    } else if (slug === 'update') {
      return NextResponse.json(await updateCompany(data, user))
    } else if (slug === 'remove_users') {
      let companyId = headersList.get('companyId')
      if(!companyId) throw new Error(ErrorTypes.NoAuth)
      await removeUsers(companyId, data, user)
    } else if (slug === 'add_user') {
      let companyId = headersList.get('companyId')
      if(!companyId) throw new Error(ErrorTypes.NoAuth)
      return NextResponse.json({
        user: await addUser(companyId, data, user)
      })
    } else if (slug === 'create_device') {
      let companyId = headersList.get('companyId')
      if(!companyId) throw new Error(ErrorTypes.NoAuth)
      return NextResponse.json(await createDevice({ companyId, user, data }))
    }

    return NextResponse.json({})
  } catch(e) {
    console.log(e)
    return sendErrorToClient(e)
  }
}