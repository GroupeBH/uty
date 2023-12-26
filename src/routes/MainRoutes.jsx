import React from 'react'
import { Routes, Route } from 'react-router-dom'

import Login from '../pages/authentification/Login'
import CustomerSignUp from '../pages/authentification/SignUp'
import Categories from '../pages/categories'
import Home from '../pages/Home'
import FindProduct from '../pages/orders/Create'
import DetailCategory from '../pages/categories/Detail'
import Categories2 from '../pages/customers/Categories'
import AnnouncementDetail from '../pages/customers/AnnouncementDetail'
import SearchResults from '../pages/customers/SearchResults'
import UserDashboard from '../pages/UserDashboard'
import TermAndConditions from '../pages/TermAndConditions'
import MentionsLegal from '../pages/MentionsLegal'
import SellConditions from '../pages/SellConditions'
import OurMission from '../pages/OurMissions'
import OurValors from '../pages/OurValors'
import ContactUs from '../pages/ContactUs'
import OurTeam from '../pages/OurTeam'

export default function MainRoutes() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route exact path="/Home" element={<Home />} />

        <Route
          exact
          path="/announcements/:id"
          element={<AnnouncementDetail />}
        />
        <Route exact path="/sign-up" element={<CustomerSignUp />} />
        <Route exact path="/sign-in" element={<Login />} />
        <Route exact path="/find-product/:id" element={<FindProduct />} />
        <Route exact path="/categories" element={<Categories />} />
        <Route exact path="/Categories2" element={<Categories2 />} />
        <Route
          exact
          path="/announcements/category/:id"
          element={<DetailCategory />}
        />

        <Route exact path="/products/:id" element={<SearchResults />} />
        <Route exact path="/legal/conditions" element={<TermAndConditions />} />
        <Route
          exact
          path="/legal/confidentiality"
          element={<MentionsLegal />}
        />
        <Route
          exact
          path="/legal/sell-conditions"
          element={<SellConditions />}
        />
        <Route exact path="/us/our-team" element={<OurTeam />} />
        <Route exact path="/us/our-mission" element={<OurMission />} />
        <Route exact path="/us/our-valors" element={<OurValors />} />
        <Route exact path="/contact-us" element={<ContactUs />} />

        <Route exact path="/Account/*" element={<UserDashboard />} />
      </Routes>
    </div>
  )
}
