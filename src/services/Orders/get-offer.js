import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getOffer = async (id, setState) => {
  await axios.get(`${BASE_URL}/api/order/offer/${id}`).then((response) => {
    setState(response.data)
    console.log(response.data)
  })
}

export { getOffer }
