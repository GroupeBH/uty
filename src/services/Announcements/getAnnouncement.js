import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const getAnnouncement = async (announcementID, setAnnouncement) => {
  await axios
    .get(`${BASE_URL}/api/announcements/${announcementID}`)
    .then((response) => {
      setAnnouncement(response.data)
      console.log(response.data)
    })
}

export { getAnnouncement }
