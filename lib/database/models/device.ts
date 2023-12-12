import { Schema, model, models, Types, Model, Document } from 'mongoose';
import { CompanyDocument } from './company';

export interface DeviceProps {
  _id: string
  name: string
  company: string
  device_id: string
  last_used: string
  status: 'active'|'deleted'
  ip_address: string
  createdAt: string
  updatedAt: string
}

export interface DeviceDocument extends Omit<DeviceProps, '_id'|'company'>, Document {
  company: CompanyDocument
}

const deviceSchema = new Schema<DeviceDocument, Model<DeviceDocument>>({
  name: { type: String, required: true },
  company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  device_id: { type: String, required: true },
  last_used: Date,
  status: { type: String, default: 'active' },
  ip_address: { type: String, required: true }
}, {strict: true, timestamps: true})

const Device: Model<DeviceDocument> = models.Device || model('Device', deviceSchema, 'devices')

export default Device

