import React, { useEffect } from 'react'
import Footer from '../components/Layout/Footer'
import Nav from '../components/Layout/Nav'
import HomeHeader from '../components/HomeHeader'
import Products from '../components/Products'
import Hr from '../components/Hr'
import CategorySection from '../components/CategorySection'
//import { onMessageListener } from '../firebase'

function Home() {
  let currentUser = JSON.parse(localStorage.getItem('currentUser'))

  useEffect(() => {
    if (currentUser && !currentUser?.haveTokenFirebase) {
      localStorage.setItem(
        'currentUser',
        JSON.stringify({ ...currentUser, haveTokenFirebase: 'false' })
      )
    }
  }, [currentUser])
  return (
    <div className="flex flex-col">
      <div className={`flex flex-col`}>
        <div className="w-full bg-inherit">
          <Nav />
          <HomeHeader />
        </div>
      </div>
      <div className="home__body -pt-4 md:pt-5">
        <div className="mb-[50px]">
          <CategorySection />
        </div>
        <div>
          <Products />
        </div>
        <Hr />
      </div>
      <div className="footer">
        <Footer />
      </div>
    </div>
  )
}

export default Home
