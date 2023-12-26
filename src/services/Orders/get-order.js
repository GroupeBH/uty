import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getOrder = async (id, setState) => {
  await axios.get(`${BASE_URL}/api/order/${id}`).then((response) => {
    setState(response.data)
    console.log(response.data)
  })
}

export { getOrder }
