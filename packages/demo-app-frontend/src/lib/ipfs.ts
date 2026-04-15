const PINATA_JWT = import.meta.env.VITE_PINATA_JWT

// Upload file to IPFS with Pinata and return the CID
export async function uploadToIPFS(file: File): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.IpfsHash
  } catch (error) {
    console.error('Pinata upload error:', error)
    throw new Error('Failed to upload to IPFS via Pinata. Please check your API key.')
  }
}

//Upload JSON to IPFS with Pinata
export async function uploadJSONToIPFS(data: object): Promise<string> {
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({ pinataContent: data }),
    })

    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`)
    }

    const result = await response.json()
    return result.IpfsHash
  } catch (error) {
    console.error('Pinata upload error:', error)
    throw new Error('Failed to upload JSON to IPFS via Pinata')
  }
}
