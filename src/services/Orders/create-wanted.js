import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const createWanted = async (data) => {
  await axios
    .post(`${BASE_URL}/api/order/create-wanted`, data)
    .then((response) => {
      console.log(response)
      window.location.assign('/categories')
    })
}

export { createWanted }
