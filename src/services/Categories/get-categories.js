import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getCategories = async (setState, setLoader) => {
  await axios.get(`${BASE_URL}/api/categories`).then((response) => {
    setState(response.data)
    console.log(response.data)
    if (setLoader) {
      setLoader(true)
    }
  })
}

export { getCategories }
