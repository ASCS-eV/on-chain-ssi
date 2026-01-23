import { useState, useRef } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CRSET_REGISTRY_ADDRESS, CRSET_REGISTRY_ABI } from '../../lib/contracts'
import { Upload, Loader2, CheckCircle2, FileJson, X, History, ExternalLink } from 'lucide-react'
import { uploadToIPFS } from '../../lib/ipfs'
import { toast } from 'sonner'

export function RevocationListPage() {
  const { address } = useAccount()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Read Current CID
  const { data: currentCID, isLoading: isReadingCID } = useReadContract({
    address: CRSET_REGISTRY_ADDRESS,
    abi: CRSET_REGISTRY_ABI,
    functionName: 'getRevocationCID',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  })

  // Write Contract
  const { writeContract, data: hash, isPending } = useWriteContract({
      mutation: {
          onError: (err) => toast.error("Transaction Failed", { description: err.message.split('\n')[0] })
      }
  })
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Handle File Selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json') {
      toast.error("Invalid File", { description: "Please upload a .json file" })
      return
    }

    // Client-side validation
    const text = await file.text()
    try {
        JSON.parse(text) // Validate JSON syntax
        setSelectedFile(file)
        setFileContent(text)
    } catch (e) {
        toast.error("Invalid JSON", { description: "File content is not valid JSON" })
    }
  }

  const clearFile = () => {
      setSelectedFile(null)
      setFileContent(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePublish = async () => {
    if (!selectedFile || !address) return

    setIsUploading(true)
    try {
        // 1. Upload to IPFS
        const cid = await uploadToIPFS(selectedFile)
        setIsUploading(false)
        
        // 2. Update Contract
        toast.info("IPFS Uploaded", { description: `CID: ${cid}. Confirming on-chain...` })
        
        writeContract({
            address: CRSET_REGISTRY_ADDRESS,
            abi: CRSET_REGISTRY_ABI,
            functionName: 'updateRevocationCID',
            args: [address, cid],
        })
    } catch (error) {
        setIsUploading(false)
        toast.error("Upload Failed", { description: "Failed to upload to IPFS" })
    }
  }

  // --- UI COMPONENTS ---

  const StatusCard = () => (
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              Current Version
          </h3>
          
          <div className="flex-1 flex flex-col justify-center">
              {isReadingCID ? (
                  <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-slate-100 rounded w-1/3"></div>
                      <div className="h-12 bg-slate-100 rounded"></div>
                  </div>
              ) : currentCID ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 break-all">
                      <p className="text-xs text-slate-500 uppercase font-bold mb-1">Active IPFS CID</p>
                      <p className="font-mono text-sm text-slate-800">{currentCID}</p>
                      
                      <div className="mt-4 pt-4 border-t border-slate-200 flex gap-3">
                          <a 
                            href={`https://ipfs.io/ipfs/${currentCID}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs flex items-center text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                              <ExternalLink className="w-3 h-3 mr-1" /> View Raw Data
                          </a>
                          <span className="text-xs flex items-center text-green-600 font-medium">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Synced
                          </span>
                      </div>
                  </div>
              ) : (
                  <div className="text-center text-slate-400 py-8">
                      <FileJson className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No revocation list published.</p>
                  </div>
              )}
          </div>
      </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Revocation Management</h1>
        <p className="text-slate-500 mt-2">Publish updated Credential Revocation Lists (CRL) to IPFS and the blockchain.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: UPLOAD ZONE (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
              <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                    selectedFile 
                        ? 'border-indigo-300 bg-indigo-50/30' 
                        : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                  {!selectedFile ? (
                      <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                              <Upload className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg">Upload JSON List</h3>
                          <p className="text-slate-500 mt-1 max-w-sm">
                              Drag and drop or click to upload your W3C Verifiable Credential revocation list.
                          </p>
                          <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="application/json" 
                            className="hidden" 
                            onChange={handleFileSelect}
                          />
                      </div>
                  ) : (
                      <div className="flex flex-col items-center">
                          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
                              <FileJson className="w-8 h-8" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-lg break-all px-4">{selectedFile.name}</h3>
                          <p className="text-slate-500 text-sm mt-1">
                              {(selectedFile.size / 1024).toFixed(2)} KB • Ready to publish
                          </p>
                          
                          <button 
                            onClick={clearFile}
                            className="mt-4 text-sm text-red-500 hover:text-red-600 flex items-center font-medium"
                          >
                              <X className="w-4 h-4 mr-1" /> Remove File
                          </button>
                      </div>
                  )}
              </div>

              {/* PREVIEW & ACTION */}
              {selectedFile && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Preview</h4>
                          <span className="text-xs text-slate-400 font-mono">JSON</span>
                      </div>
                      <pre className="p-4 bg-slate-900 text-slate-300 text-xs font-mono overflow-auto max-h-64">
                          {fileContent}
                      </pre>
                      <div className="p-4 bg-white border-t border-slate-200">
                          <button
                            onClick={handlePublish}
                            disabled={isUploading || isPending || isConfirming}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
                          >
                              {isUploading ? (
                                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading to IPFS...</>
                              ) : isPending || isConfirming ? (
                                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Confirming Transaction...</>
                              ) : (
                                  <><Upload className="w-5 h-5 mr-2" /> Publish Revocation List</>
                              )}
                          </button>
                          {isSuccess && (
                             <p className="text-center text-green-600 text-sm mt-3 font-medium animate-in fade-in">
                                 ✓ Successfully published!
                             </p>
                          )}
                      </div>
                  </div>
              )}
          </div>

          {/* RIGHT: CURRENT STATUS (1 Col) */}
          <div className="lg:col-span-1">
              <StatusCard />
          </div>
      </div>
    </div>
  )
}