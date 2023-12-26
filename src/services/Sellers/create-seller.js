import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const createSeller = async (data) => {
  await axios.post(`${BASE_URL}/api/sellers/create`, data).then((response) => {
    console.log(response)
  })
}

export { createSeller }
