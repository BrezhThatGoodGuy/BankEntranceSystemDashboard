const ENTD1 = {
    id: 1,
    name: "ENT.D1",
    MagLock: "",
    MagContact: ""
};


const ENTD2 = {
    id: 2,
    name: "ENT.D2",
    MagLock: "",
    MagContact: ""
};


const EXTD3 = {
    id: 3,
    name: "EXT.D3",
    MagLock: "",
    MagContact: ""
};


const EXTD4 = {
    id: 4,
    name: "EXT.D4",
    MagLock: "",
    MagContact: ""
};


const ENTL1 = {
    id: 1,
    name: "ENT.L1",
    status: ""
};


const ENTL2 = {
    id: 2,
    name: "ENT.L2",
    status: ""
};


const EXTL3 = {
    id: 3,
    name: "EXT.L3",
    status: ""
};


const EXTL4 = {
    id: 4,
    name: "EXT.L4",
    status: ""
    
};

const ENTC1 = {
    id: 1,
    name: "ENT.C1",
    status: ""
};


const ENTC2 = {
    id: 2,
    name: "ENT.C2",
    status: ""
};


const EXTC3 = {
    id: 3,
    name: "EXT.C3",
    status: ""
};


const EXTC4 = {
    id: 4,
    name: "EXT.C4",
    status: ""
};

const ENTB1 = {
    id: 1,
    name: "ENT.PATH",
    status: ""
};

const EXTB2 = {
    id: 2,
    name: "EXT.PATH",
    status: ""
};




function setLockStatus(){
    //from parsed JSON data
}

function setContactStatus(){
    //from parsed JSON data
}   
function setPathStatus(){
    //from parsed JSON data
}




function updateSimulationImages(){
    const doorElements = document.querySelectorAll('.door-icons');
    doorElements.forEach(doorIcon=>{
        doorIcon.innerHTML = `<img class = "door-icon" src = ${getURL(status)} alt="Loading...">`;
    });
}

function getURL(){

            const lockedImage = "locked-door.png";
            const unlockedImage = "unlocked-door.png";
            const openedImage = "open-door.png";
            const closedImage = "closed-door.png";

    switch(status){
        case "locked":
            return lockedImage;
        case "unlocked":
            return unlockedImage;
        case "opened":
            return openedImage;
        case "closed":
            return closedImage;
        default:
            return lockedImage;
    }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('username');
    window.location.href = 'login.html';
}
