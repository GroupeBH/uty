import React from 'react'

export default function SellerInfo({ seller }) {
  return (
    <div>
      <div>{seller?._id}</div>
    </div>
  )
}
