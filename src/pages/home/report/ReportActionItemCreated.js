import React from 'react';
import {Pressable, View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import lodashGet from 'lodash/get';
import ONYXKEYS from '../../../ONYXKEYS';
import RoomHeaderAvatars from '../../../components/RoomHeaderAvatars';
import ReportWelcomeText from '../../../components/ReportWelcomeText';
import participantPropTypes from '../../../components/participantPropTypes';
import * as ReportUtils from '../../../libs/ReportUtils';
import styles from '../../../styles/styles';
import * as OptionsListUtils from '../../../libs/OptionsListUtils';
import Navigation from '../../../libs/Navigation/Navigation';
import ROUTES from '../../../ROUTES';

const propTypes = {
    /** The report currently being looked at */
    report: PropTypes.shape({
        /**  Avatars corresponding to a chat */
        icons: PropTypes.arrayOf(PropTypes.string),

        /** Whether the user is not an admin of policyExpenseChat chat */
        isOwnPolicyExpenseChat: PropTypes.bool,

        /** ID of the report */
        reportID: PropTypes.number,
    }),
};
const defaultProps = {
    report: {},
    personalDetails: {},
    policies: {},
};

const ReportActionItemCreated = (props) => {
    const participants = lodashGet(props.report, 'participants', []);
    const isChatRoom = ReportUtils.isChatRoom(props.report);
    const isPolicyExpenseChat = ReportUtils.isPolicyExpenseChat(props.report);
    const avatarIcons = OptionsListUtils.getAvatarSources(props.report);

    function navigateToDetails() {
        if (isChatRoom || isPolicyExpenseChat) {
            return Navigation.navigate(ROUTES.getReportDetailsRoute(props.report.reportID));
        }
        if (participants.length === 1) {
            return Navigation.navigate(ROUTES.getDetailsRoute(participants[0]));
        }
        Navigation.navigate(ROUTES.getReportParticipantsRoute(props.report.reportID));
    }

    return (
        <View style={[
            styles.chatContent,
            styles.pb8,
            styles.p5,
        ]}
        >
            <View style={[styles.justifyContentCenter, styles.alignItemsCenter, styles.flex1]}>
                <Pressable onPress={navigateToDetails}>
                    <RoomHeaderAvatars
                        avatarIcons={avatarIcons}
                        shouldShowLargeAvatars={isPolicyExpenseChat}
                    />
                </Pressable>
                <ReportWelcomeText report={props.report} />
            </View>
        </View>
    );
};

ReportActionItemCreated.defaultProps = defaultProps;
ReportActionItemCreated.propTypes = propTypes;
ReportActionItemCreated.displayName = 'ReportActionItemCreated';

export default withOnyx({
    report: {
        key: ({reportID}) => `${ONYXKEYS.COLLECTION.REPORT}${reportID}`,
    },
    personalDetails: {
        key: ONYXKEYS.PERSONAL_DETAILS,
    },
    policies: {
        key: ONYXKEYS.COLLECTION.POLICY,
    },
})(ReportActionItemCreated);
