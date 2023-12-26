import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getOffers = async (id, setState, setLoader) => {
  await axios.get(`${BASE_URL}/api/order/offers/${id}`).then((response) => {
    setState(response.data)
    console.log(response.data)
    if (setLoader) {
      setLoader(true)
    }
  })
}

export { getOffers }
