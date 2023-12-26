import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const createProposal = async (data) => {
  await axios
    .post(`${BASE_URL}/api/order/create-proposal`, data)
    .then((response) => {
      console.log(response)
      window.location.assign('/Account')
    })
}

export { createProposal }
