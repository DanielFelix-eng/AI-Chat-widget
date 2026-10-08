import mongoose from "mongoose";

export const connectedDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`Conneted to Mongo DB :${conn.connection.host}`)


    } catch (error) {
        console.log('Error connectin to mongo db ', error.message)

    }

}
