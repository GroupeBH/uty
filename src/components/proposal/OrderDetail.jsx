import React from 'react'
import ImageCarroussel from '../ImageCarroussel'
// import moment from 'moment'

export default function OrderDetail({ order, setClick }) {
  //   useEffect(() => {
  //     console.log('il ya :', moment(order.createdAt).fromNow)
  //   })
  return (
    <div className="grid grid-cols-1 gap-3 p-5 md:gap-10 md:grid-cols-2">
      <div>
        <ImageCarroussel images={order?.wanted?.medias} />
      </div>
      <div className="flex flex-col justify-center">
        <div className="mb-3">
          <p className="mb-2">
            <span className="text-sm">Categorie</span>--
            <span className="font-poppins text-gray-800">
              {order?.category?.name}
            </span>
          </p>
          <h5 className="text-sm">Description</h5>
          <p className="font-normal">{order?.wanted.text}</p>
        </div>
        <div>
          <p className="text-sm">
            Posté par{' '}
            <span className="font-poppins">{order?.customer?.username}</span>
          </p>
          {/* <p>la demande a été posté il ya {moment(order?.createdAt).fromNow}</p> */}
        </div>
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.preventDefault()
              setClick(true)
            }}
            className="p-3 bg-primary rounded-lg text-white"
          >
            Ajouter une proposition
          </button>
        </div>
      </div>
    </div>
  )
}
