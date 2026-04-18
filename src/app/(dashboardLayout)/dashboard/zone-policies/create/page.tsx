import React from 'react'
import ClientCreateZonePolicy from './ClientCreateZonePolicy'

export default function Page() {
  return (
    <div className="flex justify-center items-center h-[80dvh]">
      <div className='bg-background w-full max-w-[800px] p-6 border border-slate-200 shadow-sm rounded-md'>
        <React.Suspense fallback={<div>Loading...</div>}>
          <ClientCreateZonePolicy />
        </React.Suspense>
      </div>
    </div>
  )
}
