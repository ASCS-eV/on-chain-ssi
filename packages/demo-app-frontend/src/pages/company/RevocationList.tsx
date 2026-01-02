import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CRSET_REGISTRY_ADDRESS, CRSET_REGISTRY_ABI } from '../../lib/contracts'
import { Upload, Loader2, CheckCircle2, AlertCircle, List } from 'lucide-react'
import { uploadToIPFS } from '../../lib/ipfs'

export function RevocationListPage() {
  const { address } = useAccount()
  const [companyDID, setCompanyDID] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [ipfsCID, setIpfsCID] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string>('')

  // We use companyDID if provided, otherwise use connected address
  const targetCompany = (companyDID && companyDID.startsWith('0x') && companyDID.length === 42) 
    ? companyDID as `0x${string}` 
    : address

  // Read the current CID from contract
  const { data: currentCID, refetch } = useReadContract({
    address: CRSET_REGISTRY_ADDRESS,
    abi: CRSET_REGISTRY_ABI,
    functionName: 'getRevocationCID',
    args: targetCompany ? [targetCompany] : undefined,
  })

  // Check if current user is authorized admin
  const { data: isAuthorized } = useReadContract({
    address: CRSET_REGISTRY_ADDRESS,
    abi: CRSET_REGISTRY_ABI,
    functionName: 'isCompanyAdmin',
    args: (targetCompany && address) ? [targetCompany, address] : undefined,
  })

  // Write contract hook to update CID
  const { writeContract, data: hash, isPending, error: txError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash
  })

  // Refetch and reset on success
  useEffect(() => {
    if (isSuccess && hash) {
      refetch()
      setIpfsCID('')
      setSelectedFile(null)
    }
  }, [isSuccess, hash, refetch])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/json') {
        setUploadError('Please select a JSON file')
        return
      }
      setSelectedFile(file)
      setUploadError('')
    }
  }

  const handleUploadToIPFS = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError('')

    try {
      const cid = await uploadToIPFS(selectedFile)
      setIpfsCID(cid)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload to IPFS')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUpdateCID = () => {
    if (!targetCompany || !ipfsCID) return

    writeContract({
      address: CRSET_REGISTRY_ADDRESS,
      abi: CRSET_REGISTRY_ABI,
      functionName: 'updateRevocationCID',
      args: [targetCompany, ipfsCID],
    })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Credential Revocation List</h1>
        <p className="text-slate-500 mt-2">Manage your company's revoked credentials.</p>
      </div>

      {/* Company DID Selection */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl">
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          Company DID Address
        </label>
        <input
          type="text"
          value={companyDID}
          onChange={(e) => setCompanyDID(e.target.value)}
          placeholder="0x... (leave empty to use your own address)"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-sm"
        />
        <p className="text-xs text-slate-500 mt-2">
          {targetCompany ? (
            <>Managing revocation list for: <span className="font-mono font-semibold">{targetCompany}</span></>
          ) : (
            'Enter a company DID address, or leave empty to manage your own'
          )}
        </p>
      </div>

      {/* Current CID Display */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
          <List className="w-5 h-5 mr-2 text-emerald-600" />
          Current Revocation List
        </h3>
        {currentCID ? (
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">IPFS CID</p>
            <p className="font-mono text-sm text-slate-900 break-all">{currentCID}</p>
            <a 
              href={`https://ipfs.io/ipfs/${currentCID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-600 hover:text-emerald-700 mt-2 inline-block"
            >
              View on IPFS →
            </a>
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No revocation list published yet.</p>
        )}
      </div>

      {/* Upload New Revocation List */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-emerald-600" />
          Update Revocation List
        </h3>

        <div className="space-y-4">
          {/* first we upload to IPFS */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Step 1: Select JSON file
            </label>
            <input
              type="file"
              accept="application/json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-emerald-50 file:text-emerald-700
                hover:file:bg-emerald-100
                cursor-pointer"
            />
            {selectedFile && (
              <p className="text-xs text-slate-500">Selected: {selectedFile.name}</p>
            )}
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start text-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <button
            onClick={handleUploadToIPFS}
            disabled={!selectedFile || isUploading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading to IPFS...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload to IPFS
              </>
            )}
          </button>

          {/*then we update companyCrset contract */}
          {ipfsCID && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-1">✓ Uploaded to IPFS</p>
                <p className="text-xs text-green-700 font-mono break-all">{ipfsCID}</p>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Step 2: Update on-chain registry
              </label>

              {!isAuthorized && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start text-sm">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">Authorization Required</p>
                    <p>You need to be designated as an admin by the Trust Anchor before you can update the revocation list.</p>
                  </div>
                </div>
              )}

              {txError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start text-sm">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span>{txError.message.split('\n')[0]}</span>
                </div>
              )}

              {isSuccess && (
                <div className="flex items-center p-4 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 mr-3" />
                  <div>
                    <p className="font-medium">Revocation list updated!</p>
                    <p className="text-sm">The new CID has been registered on-chain.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpdateCID}
                disabled={!isAuthorized || isPending || isConfirming}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Update Registry
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
