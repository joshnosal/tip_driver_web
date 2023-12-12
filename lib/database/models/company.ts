import { Schema, model, models, Types, Model, Document } from 'mongoose';
import { DeviceDocument } from './device';



export interface CompanyProps {
  _id: string
  name: string
  admins: string[]
  basic_users: string[],
  stripe_id?: string
  stripe_customer_id: string
  tip_levels: number[]
  custom_tip: boolean
  invites: {
    admins: string[]
    basic_users: string[]
  },
  devices: string[]
  createdAt: string
  updatedAt: string
}

export interface CompanyDocument extends Omit<CompanyProps, '_id'|'devices'>, Document {
  devices: DeviceDocument[]
}

const companySchema = new Schema<CompanyDocument, Model<CompanyDocument>>({
  name: String,
  admins: [String],
  basic_users: [String],
  stripe_id: String,
  stripe_customer_id: String,
  tip_levels: { type: [Number], default: [2,5,10] },
  custom_tip: { type: Boolean, default: false },
  invites: {
    admins: [String],
    basic_users: [String]
  },
  devices: [{ type: Schema.Types.ObjectId, ref: 'Device' }]
}, {strict: true, timestamps: true})



const Company: Model<CompanyDocument> = models.Company  || model('Company', companySchema, 'companies')

export default Company