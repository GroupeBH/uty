import axios from 'axios'
import { BASE_URL } from '../../helpers/Root'

const updateAnnouncement = async (announcementId, data) => {
  console.log(announcementId)
  await axios
    .patch(`${BASE_URL}/api/announcements/edit/${announcementId}`, data)
    .then((response) => {
      console.log(response)

      window.location.assign(
        `/Account/announcements/${response.data.announcement._id}`
      )
    })
}

export { updateAnnouncement }
