import mongoose from 'mongoose';

if (!process.env.MONGO_URI) throw new Error('Please add your Mongo URI to .env.local')
if (!process.env.MONGO_DB_NAME) throw new Error('Please add your Mongo URI to .env.local')
const uri = process.env.MONGO_URI + process.env.MONGO_DB_NAME;
const mongooseOptions = {}

const connectMongoose = async () => {
  console.log('Test connection')
  let db

  const handleConnecting = () => {
    console.log('Connecting to database')
  }
  const handleDisconnected = async () => {
    console.log('Lost database connection')
  }
  const handleConnected = () => {
    console.log('Connection established')
  }
  
  if(process.env.NODE_ENV === 'development') {
    if(!globalThis._db) {
      mongoose.connect(uri, mongooseOptions)
      globalThis._db = mongoose.connection
      globalThis._db.on('connecting', handleConnecting)
      globalThis._db.on('disconnected', handleDisconnected)
      globalThis._db.once('open', handleConnected)
    } else {
      console.log('Clearing models')
      delete globalThis._db.models
    }
    db = globalThis._db
  } else {
    mongoose.connect(uri, mongooseOptions)
    db = mongoose.connection
  }

  return db
}

export default connectMongoose