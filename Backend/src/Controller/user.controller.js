import { StatusCodes } from "http-status-codes";
import { User } from "../Models/user.model.js"
import { Meeting } from "../Models/meeting.model.js";
import bcrypt, { hash } from "bcrypt";
import jwt from "jsonwebtoken";


const secret = process.env.JWT_SECRET;

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(StatusCodes.BAD_REQUEST).json({ message: "Please Provide" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(StatusCodes.NOT_FOUND).json({ message: "User Not Found" })
        }


        let isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            let token = jwt.sign({ username: user.username }, secret, { expiresIn: "1d" });

            return res.status(StatusCodes.OK).json({ token: token })
        } else {
            return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid USername or password" })
        }

    } catch (e) {

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e}` })

    }

}

const register = async (req, res) => {
    const { name, username, password } = req.body;


    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(StatusCodes.FOUND).json({ message: "User already exists" });

        }


        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(StatusCodes.CREATED).json({ message: "User Register" })

    } catch (e) {

        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong ${e}` })

    }
}

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    try {
        const decoded = jwt.verify(token, secret);
        const meetings = await Meeting.find({ user_id: decoded.username });
        res.json(meetings);
    } catch (e) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: `Unauthorized or invalid token: ${e}` });
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    try {
        const decoded = jwt.verify(token, secret);

        const newMeeting = new Meeting({
            user_id: decoded.username,
            meetingCode: meeting_code
        });

        await newMeeting.save();
        res.status(StatusCodes.CREATED).json({ message: "Added code to History" });
    } catch (e) {
        res.status(StatusCodes.UNAUTHORIZED).json({ message: `Unauthorized or invalid token: ${e}` });
    }
}

export { login, register, getUserHistory, addToHistory };