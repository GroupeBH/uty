import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const postAnnouncement = async (data) => {
  await axios
    .post(`${BASE_URL}/api/announcements/post`, data)
    .then((response) => {
      console.log(response)
      window.location.assign(
        `/Account/announcements/${response.data.announcement._id}`
      )
    })
}

export { postAnnouncement }
