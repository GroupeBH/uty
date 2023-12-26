import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getProposals = async (id, setState, setLoader) => {
  await axios.get(`${BASE_URL}/api/order/proposals/${id}`).then((response) => {
    setState(response.data)
    console.log(response.data)
    if (setLoader) {
      setLoader(true)
    }
  })
}

export { getProposals }
