import { React, useState, useRef } from 'react';
import { ReactComponent as Settings } from '../assets/svg/settings.svg';
import { ReactComponent as Left } from '../assets/svg/arrowLeft.svg';
import '../css-components/DropDownMenu.css';
import { ReactComponent as Doge } from '../assets/doge.svg';
import { ReactComponent as Ball } from '../assets/svg/pokeBall.svg';
import { ReactComponent as Discord } from '../assets/svg/discordLogo.svg';
import { ReactComponent as Login } from '../assets/svg/login.svg';
import { ReactComponent as Logout } from '../assets/svg/logout.svg';
import { ReactComponent as ProfilePic } from '../assets/svg/photo.svg';
import { ReactComponent as Password } from '../assets/svg/lock.svg';
import { ReactComponent as RightIcon } from '../assets/svg/chevronRight.svg';
import { CSSTransition } from 'react-transition-group';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';
import { useMobile } from '../contexts/MobileContext';

export default function DropDownMenu(props) {
  const { signOut, currentUser } = useAuth();
  const { updateDoge, doge } = useTheme();
  const { isMobile } = useMobile();
  const [activeMenu, setActiveMenu] = useState('main');
  const [menuHeight, setMenuHeight] = useState(null);
  const [firstTime, setFirstTime] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  function calcHeight(el) {
    let height = 0;
    if (firstTime === true && !isMobile) {
      height = el.offsetHeight + 20;
      setMenuHeight(height);
    } else if (isMobile) {
      height = el.offsetHeight;
      setMenuHeight(height);
    } else height = el.offsetHeight;
    setMenuHeight(height);
    setFirstTime(false);
  }

  const Help = () => {
    <div onClick={() => navigate('/help')}>
      <DropDownItem
        Icon={<Help style={{ stroke: 'white' }} />}
        IconText="Help"
      />
    </div>;
  };

  const discLink = 'https://discord.gg/234DDJUQpD';

  function activateDoge() {
    updateDoge();
  }

  function DropDownItem(props) {
    return (
      <a target="_blank" rel="noreferrer" href={props.link}>
        <div
          className="menu-item"
          style={props.style}
          onClick={() => props.goToMenu && setActiveMenu(props.goToMenu)}
        >
          <div className={props.MenuIcon && 'menu-icon-button'}>
            {props.MenuIcon}
          </div>
          <div className={props.Icon && 'icon-button'}>{props.Icon}</div>
          <span
            style={props.style}
            className={props.MenuIcon ? 'menu-icon-text' : 'icon-text'}
          >
            {props.IconText}
          </span>

          {props.children}
        </div>
      </a>
    );
  }

  return (
    <>
      <div
        className="dropdown"
        style={{ height: menuHeight }}
        ref={dropdownRef}
      >
        {!currentUser ? (
          <>
            <CSSTransition
              dropdownRef={dropdownRef}
              in={activeMenu === 'main'}
              timeout={200}
              classNames="menu-primary"
              unmountOnExit
              onEnter={calcHeight}
            >
              <div className="menu">
                <div>
                  <DropDownItem
                    IconText="Settings"
                    goToMenu="settings"
                    Icon={<Settings />}
                    RightIcon={<RightIcon />}
                  />
                </div>

                <div onClick={() => navigate('/login')}>
                  <DropDownItem
                    Icon={<Login style={{ transform: 'translateX(3px)' }} />}
                    IconText="Log In / Sign Up"
                  />
                </div>
              </div>
            </CSSTransition>

            <CSSTransition
              in={activeMenu === 'settings'}
              timeout={200}
              classNames="menu-secondary"
              unmountOnExit
              onEnter={calcHeight}
            >
              <div className="menu">
                <DropDownItem
                  MenuIcon={<Left style={{ width: '25px' }} />}
                  goToMenu="main"
                  TextStyle={{ fontSize: '1.4rem' }}
                  IconText="Settings"
                />

                <div onClick={activateDoge}>
                  <DropDownItem
                    Icon={<Doge />}
                    IconText={doge ? 'Deactivate Doge' : 'Activate Doge'}
                  />
                </div>
                <DropDownItem
                  Icon={<Discord />}
                  IconText="Discord server"
                  link={discLink}
                ></DropDownItem>

                <DropDownItem IconText="Catch em all" Icon={<Ball />} />
              </div>
            </CSSTransition>
          </>
        ) : (
          <>
            <CSSTransition
              dropdownRef={dropdownRef}
              in={activeMenu === 'main'}
              timeout={200}
              classNames="menu-primary"
              unmountOnExit
              onEnter={calcHeight}
            >
              <div className="menu">
                <div>
                  <DropDownItem
                    IconText="Settings"
                    goToMenu="settings"
                    Icon={<Settings />}
                    RightIcon={<RightIcon />}
                  />
                </div>

                {/* <div>
                  <DropDownItem
                    Icon={<Friends style={{ stroke: "white" }} />}
                    IconText="Friends(disabled)"
                  />
                </div> */}

                <div onClick={signOut}>
                  <DropDownItem
                    Icon={<Logout style={{ transform: 'translateX(3px)' }} />}
                    IconText="Sign Out"
                  />
                </div>
              </div>
            </CSSTransition>

            <CSSTransition
              in={activeMenu === 'settings'}
              timeout={200}
              classNames="menu-secondary"
              unmountOnExit
              onEnter={calcHeight}
            >
              <div className="menu">
                <DropDownItem
                  MenuIcon={<Left style={{ width: '25px' }} />}
                  goToMenu="main"
                  TextStyle={{ fontSize: '1.4rem' }}
                  IconText="Settings"
                />

                <div onClick={activateDoge}>
                  <DropDownItem
                    Icon={<Doge />}
                    IconText={doge ? 'Deactivate Doge' : 'Activate Doge'}
                  />
                </div>

                <div>
                  <DropDownItem
                    Icon={<Password />}
                    IconText="Change Password"
                  />
                </div>
                <DropDownItem
                  Icon={<Discord />}
                  IconText="Discord server"
                  link={discLink}
                ></DropDownItem>

                {/* <DropDownItem IconText="Catch em all" Icon={<Ball />} /> */}
              </div>
            </CSSTransition>
          </>
        )}
      </div>
    </>
  );
}
