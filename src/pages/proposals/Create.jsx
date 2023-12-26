import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrder } from '../../services/Orders/get-order'
// import _ from 'lodash'
import OrderDetail from '../../components/proposal/OrderDetail'
import CreateForm from '../../components/proposal/CreateForm'

export default function Create() {
  const params = useParams()

  const [wanted, setWanted] = useState()
  const [click, setClick] = useState(false)

  useEffect(() => {
    getOrder(params.id, setWanted)
  }, [])
  return (
    <div>
      {!click ? (
        <OrderDetail order={wanted} setClick={setClick} />
      ) : (
        <CreateForm order={wanted} />
      )}
    </div>
  )
}
