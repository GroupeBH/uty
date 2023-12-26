import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getCategory = async (id, setState) => {
  await axios.get(`${BASE_URL}/api/categories/${id}`).then((response) => {
    setState(response.data)
    console.log('category:', response.data)
  })
}

export { getCategory }
