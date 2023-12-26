import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getSeller = async (sellerID, setState) => {
  await axios.get(`${BASE_URL}/api/seller/${sellerID}`).then((response) => {
    setState(response.data)
    console.log(response.data)
  })
}

export { getSeller }
