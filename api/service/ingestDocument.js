import Document from "../models/documents.js";
import Chunk from "../models/chunk.js";
import { extractText } from "./extract.js";
const  MIN_TEXT_LENGTH  =  50;
 async function  markFailed(documentId , message) {  try {
     await  Chunk.deleteMany({documentId})  // this is to ensure no  partial Chunks behind 
      await Document.findByIdAndUpdate(documentId, { status: "failed", errorMessage: message });
 } catch  (error) {  console.error("Error deleting chunks for failed document:", error);  } }   
  //   ingestDocument.js
   async function ingestDocument(documentId) { 
     const doc  =  await    Document.findOneAndUpdate({id :  documentId , status: 'pending'} 
         , {
         status: 'processing' , errorMessage: null
     }  , { new: true }); 
       
      if(!doc) return
 try{ 
    //extract
     const  pages= await  doc.extractText(doc);
      
        const totalChars = pages.reduce((sum, p) => sum + p.text.trim().length, 0);
        if (totalChars < MIN_TEXT_LENGTH) {
            throw new Error(
                'No readable text found. The file may be a scanned PDF (image only).'
            );
        }
 
        console.log(
            `[ingestion] ${doc._id}: extracted ${pages.length} page(s), ${totalChars} chars`
        );
 
        // 2. TODO (step 3): clean -> chunk -> embed -> Chunk.insertMany
        // 3. TODO (step 3): Document.status = 'ready', chunkCount = N
    } catch (err) {
        console.error(`[ingestion] ${documentId} failed:`, err);
        await markFailed(documentId, err.message);
    }
     }
     
export { ingestDocument };