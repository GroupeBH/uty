import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getWantedProducts = async (setState, setLoader) => {
  await axios.get(`${BASE_URL}/api/order/wanted-products`).then((response) => {
    setState(response.data)
    console.log(response.data)
    if (setLoader) {
      setLoader(true)
    }
  })
}

export { getWantedProducts }
