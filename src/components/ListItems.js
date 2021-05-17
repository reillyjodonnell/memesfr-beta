import React from "react";
import "../CSS Components/ListItems.css";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import HomeIcon from "@material-ui/icons/Home";
import TrendingIcon from "@material-ui/icons/TrendingUp";
import PeopleIcon from "@material-ui/icons/Whatshot";
import RecentIcon from "@material-ui/icons/AccessTime";
import LayersIcon from "@material-ui/icons/Casino";
import { useAuth } from "../contexts/AuthContext";

import AssignmentIcon from "@material-ui/icons/Assignment";

export default function MainListItems(props) {
  return (
    <div>
      <ListItem button>
        <ListItemIcon>
          <HomeIcon />
        </ListItemIcon>
        <ListItemText primary="Home" />
      </ListItem>
      <ListItem button>
        <ListItemIcon>
          <TrendingIcon />
        </ListItemIcon>
        <ListItemText primary="Trending" />
      </ListItem>
      <ListItem onClick={props.popularFilter} button>
        <ListItemIcon>
          <PeopleIcon />
        </ListItemIcon>
        <ListItemText primary="Popular" />
      </ListItem>
      <ListItem onClick={props.recentFilter} button>
        <ListItemIcon>
          <RecentIcon />
        </ListItemIcon>
        <ListItemText primary="Recent" />
      </ListItem>
      <ListItem button>
        <ListItemIcon>
          <LayersIcon />
        </ListItemIcon>
        <ListItemText primary="Random meme" />
      </ListItem>
    </div>
  );
}

export function SecondaryListItems() {
  const { currentUser } = useAuth();
  var username = currentUser.displayName;

  return (
    <div>
      <ListSubheader inset>{username}'s lists</ListSubheader>
      <ListItem button>
        <ListItemIcon>
          <AssignmentIcon />
        </ListItemIcon>
        <ListItemText primary="Current month" />
      </ListItem>
      <ListItem button>
        <ListItemIcon>
          <AssignmentIcon />
        </ListItemIcon>
        <ListItemText primary="Last quarter" />
      </ListItem>
      <ListItem button>
        <ListItemIcon>
          <AssignmentIcon />
        </ListItemIcon>
        <ListItemText primary="Year-end sale" />
      </ListItem>
    </div>
  );
}
